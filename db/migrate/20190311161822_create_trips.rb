class CreateTrips < ActiveRecord::Migration[5.2]
  def change
    create_table :trips do |t|
      t.string :city_name
      t.string :start_date
      t.string :end_date
      t.string :name
      t.string :img_url
      t.string :destination
      t.timestamps
    end
  end
end
